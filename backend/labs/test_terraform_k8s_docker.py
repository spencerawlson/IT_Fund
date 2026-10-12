"""Tests for the Terraform for Kubernetes & Docker lab (terraform-k8s-docker-001).

Covers the terraform_cli shell's k8s scenario (scenario dispatch, write command,
HCL validation, plan/apply/destroy/state/output), the lab-scoped validators
(pass/fail), and the lab definition structure. Also asserts the AWS scenario
(terraform-fundamentals-001) is unaffected.
"""
import sys
from pathlib import Path
from types import SimpleNamespace

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from labs.shells import terraform_cli
from labs.definitions.terraform_k8s_docker import TERRAFORM_K8S_DOCKER_LAB as LAB
from labs.definitions.terraform_fundamentals import TERRAFORM_FUNDAMENTALS_LAB as AWS_LAB
from labs.validators import VALIDATORS

K8S_RESOURCES = [
    'kubernetes_namespace.app',
    'kubernetes_config_map.app_config',
    'kubernetes_deployment.web',
    'kubernetes_service.web',
    'docker_image.app',
    'docker_network.app_net',
    'docker_volume.cache_data',
    'docker_container.cache',
]

K8S_TF = '''resource "kubernetes_deployment" "web" {
  metadata { name = "web" }
  spec { replicas = 3 }
}
resource "kubernetes_service" "web" {
  metadata { name = "web" }
  spec { selector = { app = "web" } type = "ClusterIP" }
}
resource "kubernetes_config_map" "app_config" {
  metadata { name = "app-config" }
  data = { LOG_LEVEL = "info" }
}
'''

DOCKER_TF = '''resource "docker_image" "app" {
  name = "road2cissp/app:latest"
}
resource "docker_container" "cache" {
  name = "redis-cache"
  image = "redis:7-alpine"
}
'''

VARIABLES_TF = '''variable "replicas" {
  type = number
  default = 3
}
'''

OUTPUTS_TF = '''output "namespace" {
  value = kubernetes_namespace.app.metadata[0].name
}
'''


def run_cmd(cmd, findings, lab=LAB):
    result = terraform_cli.run(lab, cmd, findings)
    findings.update(result.findings or {})
    return result


def fresh():
    return {}


def write_file(findings, name, content):
    return run_cmd(f"write {name}\n{content}\nEOF", findings)


# ---------------------------------------------------------------------------
# shell interface / scenario dispatch
# ---------------------------------------------------------------------------

def test_k8s_prompt_and_banner():
    assert 'k8s-infra' in terraform_cli.initial_prompt(LAB)
    assert 'infra' in terraform_cli.initial_prompt(AWS_LAB)
    assert 'k8s-infra' not in terraform_cli.initial_prompt(AWS_LAB)
    banner = terraform_cli.banner(LAB)
    assert any('Kubernetes & Docker' in line for line in banner)
    aws_banner = terraform_cli.banner(AWS_LAB)
    assert any('fundamentals' in line for line in aws_banner)


def test_k8s_help_mentions_write():
    r = terraform_cli.run(LAB, 'help', {})
    assert 'write <file>' in r.output
    assert 'kubernetes + docker providers' in r.output
    r = terraform_cli.run(AWS_LAB, 'help', {})
    assert 'write <file>' not in r.output


def test_write_rejected_in_aws_scenario():
    r = terraform_cli.run(AWS_LAB, 'write k8s.tf\nfoo\nEOF', {})
    assert r.exit_code == 1


def test_gating_init_first():
    assert terraform_cli.run(LAB, 'terraform plan', {}).exit_code == 1
    assert terraform_cli.run(LAB, 'terraform validate', {}).exit_code == 1
    assert terraform_cli.run(LAB, 'terraform apply -auto-approve', {}).exit_code == 1
    assert terraform_cli.run(LAB, 'terraform destroy -auto-approve', {}).exit_code == 1
    assert terraform_cli.run(LAB, 'terraform state list', {}).exit_code == 1
    assert terraform_cli.run(LAB, 'terraform output', {}).exit_code == 1


# ---------------------------------------------------------------------------
# write command + HCL validation
# ---------------------------------------------------------------------------

def test_write_valid_hcl():
    f = fresh()
    r = write_file(f, 'k8s.tf', K8S_TF)
    assert r.exit_code == 0, r.output
    assert 'Wrote' in r.output
    assert f['k8s_files']['k8s.tf'] == K8S_TF.strip('\n')
    assert f['k8s_replicas'] == 3


def test_write_rejects_unbalanced_braces():
    f = fresh()
    r = write_file(f, 'k8s.tf', 'resource "kubernetes_deployment" "web" {\n  spec { replicas = 3 }\n')
    assert r.exit_code == 1
    assert 'unbalanced' in r.output
    assert 'k8s_files' not in f


def test_write_rejects_missing_blocks():
    f = fresh()
    # valid HCL shape but wrong resource for k8s.tf
    r = write_file(f, 'k8s.tf', 'resource "aws_instance" "web" {\n  ami = "x"\n}\n')
    assert r.exit_code == 1
    assert 'missing required block' in r.output


def test_write_rejects_non_tf():
    f = fresh()
    r = terraform_cli.run(LAB, 'write notes.txt\nhello\nEOF', f)
    assert r.exit_code == 1


def test_write_rejects_unterminated_heredoc():
    f = fresh()
    r = terraform_cli.run(LAB, 'write k8s.tf\nresource "x" "y" { }', f)
    assert r.exit_code == 1
    assert 'EOF' in r.output


def test_write_rejects_empty():
    f = fresh()
    r = terraform_cli.run(LAB, 'write k8s.tf\n\nEOF', f)
    assert r.exit_code == 1


def test_write_detects_replica_change():
    f = fresh()
    tf = K8S_TF.replace('replicas = 3', 'replicas = 5')
    r = write_file(f, 'k8s.tf', tf)
    assert r.exit_code == 0
    assert f['k8s_replicas'] == 5


def test_cat_shows_starter_and_written_files():
    f = fresh()
    r = run_cmd('cat main.tf', f)
    assert 'provider "kubernetes"' in r.output
    assert 'provider "docker"' in r.output
    assert 'kubernetes_namespace' in r.output
    assert f.get('k8s_config_viewed')
    write_file(f, 'k8s.tf', K8S_TF)
    r = run_cmd('cat k8s.tf', f)
    assert 'kubernetes_deployment' in r.output
    r = run_cmd('cat nope.tf', f)
    assert r.exit_code == 1


def test_ls_lists_files():
    f = fresh()
    r = run_cmd('ls', f)
    assert 'main.tf' in r.output
    write_file(f, 'docker.tf', DOCKER_TF)
    r = run_cmd('ls', f)
    assert 'docker.tf' in r.output


# ---------------------------------------------------------------------------
# full workflow
# ---------------------------------------------------------------------------

def _setup_to_apply():
    f = fresh()
    run_cmd('cat main.tf', f)
    run_cmd('terraform init', f)
    run_cmd('terraform validate', f)
    write_file(f, 'k8s.tf', K8S_TF)
    write_file(f, 'docker.tf', DOCKER_TF)
    write_file(f, 'variables.tf', VARIABLES_TF)
    write_file(f, 'outputs.tf', OUTPUTS_TF)
    return f


def test_init_installs_both_providers():
    f = fresh()
    r = run_cmd('terraform init', f)
    assert 'hashicorp/kubernetes' in r.output
    assert 'kreuzwerker/docker' in r.output
    assert f.get('init_done')


def test_validate_after_init():
    f = fresh()
    run_cmd('terraform init', f)
    r = run_cmd('terraform validate', f)
    assert r.exit_code == 0
    assert 'valid' in r.output.lower()


def test_plan_lists_all_resources():
    f = _setup_to_apply()
    r = run_cmd('terraform plan -out=tfplan', f)
    assert r.exit_code == 0
    for res in K8S_RESOURCES:
        assert res in r.output, f"missing {res} in plan"
    assert '8 to add' in r.output
    assert f.get('k8s_plan_saved') == 'tfplan'


def test_apply_provisions_all():
    f = _setup_to_apply()
    run_cmd('terraform plan -out=tfplan', f)
    r = run_cmd('terraform apply tfplan', f)
    assert 'Apply complete' in r.output
    assert '8 added' in r.output
    assert f.get('k8s_applied')
    assert f.get('k8s_ever_applied')
    for res in K8S_RESOURCES:
        assert res in (f.get('k8s_applied_resources') or [])


def test_apply_interactive_confirm():
    f = _setup_to_apply()
    r = run_cmd('terraform apply', f)
    assert 'Enter a value' in r.output
    assert f.get('k8s_pending_apply')
    r = run_cmd('yes', f)
    assert 'Apply complete' in r.output
    assert f.get('k8s_applied')


def test_apply_unknown_plan_file():
    f = _setup_to_apply()
    r = run_cmd('terraform apply nope.tfplan', f)
    assert r.exit_code == 1


def test_state_and_output():
    f = _setup_to_apply()
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform state list', f)
    assert r.exit_code == 0
    for res in K8S_RESOURCES:
        assert res in r.output
    assert f.get('k8s_state_viewed')
    r = run_cmd('terraform output', f)
    assert 'service_cluster_ip' in r.output
    assert 'namespace' in r.output
    assert f.get('k8s_outputs_viewed')
    r = run_cmd('terraform output service_cluster_ip', f)
    assert '10.96.42.7' in r.output
    r = run_cmd('terraform output bogus', f)
    assert r.exit_code == 1


def test_show():
    f = _setup_to_apply()
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform show', f)
    assert 'kubernetes_deployment.web' in r.output
    assert 'docker_container.cache' in r.output


def test_scale_in_place_update():
    f = _setup_to_apply()
    run_cmd('terraform apply -auto-approve', f)
    # rewrite with replicas = 5
    write_file(f, 'k8s.tf', K8S_TF.replace('replicas = 3', 'replicas = 5'))
    assert f['k8s_replicas'] == 5
    r = run_cmd('terraform plan', f)
    assert '1 to change' in r.output
    assert 'replicas' in r.output
    assert '3 -> 5' in r.output
    r = run_cmd('terraform apply -auto-approve', f)
    assert '1 changed' in r.output
    assert f.get('k8s_scale_deployed')
    r = run_cmd('terraform output web_replicas', f)
    assert '"5"' in r.output


def test_plan_no_changes_when_clean():
    f = _setup_to_apply()
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform plan', f)
    assert 'No changes' in r.output


def test_destroy():
    f = _setup_to_apply()
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform destroy', f)
    assert 'Enter a value' in r.output
    assert f.get('k8s_pending_destroy')
    r = run_cmd('yes', f)
    assert 'Destroy complete' in r.output
    assert '8 destroyed' in r.output
    assert f.get('k8s_destroyed')
    assert not f.get('k8s_applied')


def test_destroy_auto_approve():
    f = _setup_to_apply()
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform destroy -auto-approve', f)
    assert 'Destroy complete' in r.output


def test_destroy_without_apply_fails():
    f = fresh()
    run_cmd('terraform init', f)
    r = run_cmd('terraform destroy -auto-approve', f)
    assert r.exit_code == 1


# ---------------------------------------------------------------------------
# validators
# ---------------------------------------------------------------------------

def _call(name, findings):
    fn = VALIDATORS[name]
    ok, msg, data = fn({}, findings)
    return ok, msg


def test_validators_full_pass_path():
    f = fresh()
    assert not _call('tfk8s_providers_ready', f)[0]
    run_cmd('cat main.tf', f)
    assert not _call('tfk8s_providers_ready', f)[0]
    run_cmd('terraform init', f)
    run_cmd('terraform validate', f)
    assert _call('tfk8s_providers_ready', f)[0]

    assert not _call('tfk8s_deployment_written', f)[0]
    write_file(f, 'k8s.tf', K8S_TF)
    assert _call('tfk8s_deployment_written', f)[0]
    assert _call('tfk8s_service_configmap_written', f)[0]

    assert not _call('tfk8s_docker_written', f)[0]
    write_file(f, 'docker.tf', DOCKER_TF)
    assert _call('tfk8s_docker_written', f)[0]

    assert not _call('tfk8s_variables_outputs_written', f)[0]
    write_file(f, 'variables.tf', VARIABLES_TF)
    assert not _call('tfk8s_variables_outputs_written', f)[0]
    write_file(f, 'outputs.tf', OUTPUTS_TF)
    assert _call('tfk8s_variables_outputs_written', f)[0]

    assert not _call('tfk8s_applied', f)[0]
    run_cmd('terraform apply -auto-approve', f)
    assert _call('tfk8s_applied', f)[0]

    assert not _call('tfk8s_scaled', f)[0]
    write_file(f, 'k8s.tf', K8S_TF.replace('replicas = 3', 'replicas = 5'))
    assert not _call('tfk8s_scaled', f)[0]  # written but not deployed
    run_cmd('terraform apply -auto-approve', f)
    assert _call('tfk8s_scaled', f)[0]

    assert not _call('tfk8s_destroyed', f)[0]
    run_cmd('terraform destroy -auto-approve', f)
    assert _call('tfk8s_destroyed', f)[0]


def test_validators_reject_partial_files():
    f = fresh()
    # deployment without replicas
    bad = K8S_TF.replace('spec { replicas = 3 }', 'spec { }')
    write_file(f, 'k8s.tf', bad)
    assert not _call('tfk8s_deployment_written', f)[0]


# ---------------------------------------------------------------------------
# lab definition structure
# ---------------------------------------------------------------------------

def test_lab_definition():
    assert LAB.id == 'terraform-k8s-docker-001'
    assert LAB.shell == 'terraform_cli'
    assert len(LAB.objectives) == 8
    ids = [o.id for o in LAB.objectives]
    assert len(ids) == len(set(ids)), "objective ids must be unique"
    for o in LAB.objectives:
        assert o.validator in VALIDATORS, f"unknown validator: {o.validator}"
        assert o.description and len(o.description) > 100, f"{o.id} needs thorough HCL teaching"
        assert o.hints, f"{o.id} needs hints"


def test_lab_registered():
    from labs.definitions import ALL_LABS
    ids = [lab.id for lab in ALL_LABS]
    assert 'terraform-k8s-docker-001' in ids


def test_aws_scenario_unaffected():
    # spot-check the original lab still behaves identically
    f = {}
    r = terraform_cli.run(AWS_LAB, 'terraform init', f)
    f.update(r.findings or {})
    assert 'hashicorp/aws' in r.output
    assert 'kubernetes' not in r.output
